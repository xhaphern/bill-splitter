import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TabBar, { TabBarItem } from "./TabBar";

const StubIcon: React.FC<{ size?: number }> = () => (
  <svg role="presentation" />
);

const buildItems = (onScan?: () => void): TabBarItem[] => [
  { type: "route", to: "/split", label: "Split", icon: StubIcon },
  { type: "route", to: "/history", label: "History", icon: StubIcon },
  { type: "route", to: "/friends", label: "Friends", icon: StubIcon },
  { type: "route", to: "/profile", label: "Profile", icon: StubIcon },
  {
    type: "action",
    label: "Scan",
    icon: StubIcon,
    navigateTo: "/split",
    ariaLabel: "Scan receipt",
    onSelect: onScan,
  },
];

describe("TabBar", () => {
  it("marks the current route with aria-current", () => {
    render(
      <MemoryRouter initialEntries={["/history"]}>
        <TabBar items={buildItems()} />
      </MemoryRouter>,
    );

    const historyLink = screen.getByRole("link", { name: /history/i });
    expect(historyLink).toHaveAttribute("aria-current", "page");

    const splitLink = screen.getByRole("link", { name: /split/i });
    expect(splitLink).not.toHaveAttribute("aria-current");
  });

  it("supports keyboard arrow navigation between tabs", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/split"]}>
        <TabBar items={buildItems()} />
      </MemoryRouter>,
    );

    const splitLink = screen.getByRole("link", { name: /split/i });
    splitLink.focus();
    expect(document.activeElement).toBe(splitLink);

    await user.keyboard("{ArrowRight}");
    const historyLink = screen.getByRole("link", { name: /history/i });
    expect(document.activeElement).toBe(historyLink);

    await user.keyboard("{End}");
    const scanButton = screen.getByRole("button", { name: /scan receipt/i });
    expect(document.activeElement).toBe(scanButton);

    await user.keyboard("{ArrowLeft}");
    const profileLink = screen.getByRole("link", { name: /profile/i });
    expect(document.activeElement).toBe(profileLink);
  });
});
