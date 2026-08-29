import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { Alert, Button, Card, Input, Spinner } from "./index";

it("keeps shared primitive markup stable", () => {
  const { container } = render(
    <Card title="Profile">
      <Input aria-label="Name" defaultValue="Ada" />
      <Alert kind="info" message="Saved" />
      <Button>Continue</Button>
      <Spinner />
    </Card>,
  );
  expect(container.firstChild).toMatchSnapshot();
});
