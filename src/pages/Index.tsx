import { forwardRef } from "react";
import Login from "./Login";

const Index = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref}>
      <Login />
    </div>
  );
});

Index.displayName = "Index";

export default Index;
