CREATE TABLE IF NOT EXISTS family_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drop policies if they exist to be safe on reruns
DROP POLICY IF EXISTS "Users can insert requests" ON family_requests;
DROP POLICY IF EXISTS "Users can view their requests" ON family_requests;
DROP POLICY IF EXISTS "Users can update requests aimed at them" ON family_requests;

ALTER TABLE family_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert requests" ON family_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their requests" ON family_requests
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can update requests aimed at them" ON family_requests
    FOR UPDATE USING (auth.uid() = target_user_id);

CREATE OR REPLACE FUNCTION accept_family_request(req_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_target_group_id UUID;
    v_requester_group_id UUID;
    v_requester_names TEXT[];
    v_requester_ages TEXT[];
    v_target_names TEXT[];
    v_target_ages TEXT[];
BEGIN
    -- 1. Get the request
    SELECT * INTO v_req FROM family_requests WHERE id = req_id AND status = 'pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or not pending';
    END IF;

    -- Verify the target user is the one accepting
    IF v_req.target_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 2. Get target user's group
    SELECT family_group_id INTO v_target_group_id 
    FROM family_group_members 
    WHERE user_id = v_req.target_user_id LIMIT 1;

    IF v_target_group_id IS NULL THEN
        RAISE EXCEPTION 'Target user does not have a family group';
    END IF;

    -- 3. Get requester's group
    SELECT family_group_id INTO v_requester_group_id 
    FROM family_group_members 
    WHERE user_id = v_req.requester_id LIMIT 1;

    -- 4. Move members if different groups
    IF v_requester_group_id IS NOT NULL AND v_requester_group_id != v_target_group_id THEN
        -- Insert members into target group, skipping if already there
        INSERT INTO family_group_members (family_group_id, user_id)
        SELECT v_target_group_id, user_id 
        FROM family_group_members m1
        WHERE family_group_id = v_requester_group_id
          AND NOT EXISTS (
              SELECT 1 FROM family_group_members m2 
              WHERE m2.family_group_id = v_target_group_id AND m2.user_id = m1.user_id
          );

        -- Delete old members from requester group
        DELETE FROM family_group_members WHERE family_group_id = v_requester_group_id;
        
        -- Delete the old group
        DELETE FROM family_groups WHERE id = v_requester_group_id;
    ELSIF v_requester_group_id IS NULL THEN
        -- Requester doesn't have a group, just add them
        IF NOT EXISTS (
            SELECT 1 FROM family_group_members 
            WHERE family_group_id = v_target_group_id AND user_id = v_req.requester_id
        ) THEN
            INSERT INTO family_group_members (family_group_id, user_id)
            VALUES (v_target_group_id, v_req.requester_id);
        END IF;
    END IF;

    -- 5. Merge text members (arrays) from requester to target
    SELECT family_names, family_ages 
    INTO v_requester_names, v_requester_ages 
    FROM profiles WHERE id = v_req.requester_id;

    IF array_length(v_requester_names, 1) > 0 OR array_length(v_requester_ages, 1) > 0 THEN
        SELECT family_names, family_ages 
        INTO v_target_names, v_target_ages 
        FROM profiles WHERE id = v_req.target_user_id;

        -- Concatenate arrays or initialize if null
        v_target_names := COALESCE(v_target_names, ARRAY[]::TEXT[]) || COALESCE(v_requester_names, ARRAY[]::TEXT[]);
        v_target_ages := COALESCE(v_target_ages, ARRAY[]::TEXT[]) || COALESCE(v_requester_ages, ARRAY[]::TEXT[]);

        -- Update target profile
        UPDATE profiles SET 
            family_names = v_target_names,
            family_ages = v_target_ages,
            family_members_count = greatest(array_length(v_target_names, 1), array_length(v_target_ages, 1), 0)
        WHERE id = v_req.target_user_id;

        -- Clear requester profile arrays
        UPDATE profiles SET 
            family_names = ARRAY[]::TEXT[],
            family_ages = ARRAY[]::TEXT[],
            family_members_count = 0
        WHERE id = v_req.requester_id;
    END IF;

    -- 6. Update request status
    UPDATE family_requests SET status = 'accepted', updated_at = now() WHERE id = req_id;
END;
$$;

CREATE OR REPLACE FUNCTION reject_family_request(req_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req FROM family_requests WHERE id = req_id AND status = 'pending';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or not pending';
    END IF;

    IF v_req.target_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE family_requests SET status = 'rejected', updated_at = now() WHERE id = req_id;
END;
$$;
