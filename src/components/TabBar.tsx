import type { ReactNode } from "react";
import { useCallback, useMemo, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/glass.css";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface BaseItem {
  label: string;
  icon: IconComponent;
  id?: string;
}

interface RouteItem extends BaseItem {
  type: "route";
  to: string;
}

interface ActionItem extends BaseItem {
  type: "action";
  onSelect?: () => void;
  navigateTo?: string;
  ariaLabel?: string;
}

export type TabBarItem = RouteItem | ActionItem;

interface TabBarProps {
  items: TabBarItem[];
  className?: string;
  accessory?: ReactNode;
}

const SPACE_KEYS = new Set([" ", "Spacebar", "Space"]);

export default function TabBar({ items, className = "", accessory }: TabBarProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const refs = useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  const routeItems = useMemo(() => items.filter((item): item is RouteItem => item.type === "route"), [items]);
  const accessoryAction = useMemo(
    () => items.find((item): item is ActionItem => item.type === "action"),
    [items],
  );

  const safeAreaStyle = useMemo(
    () => ({
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
    }),
    [],
  );

  const focusItem = useCallback((index: number) => {
    const target = refs.current[index];
    if (target) {
      target.focus();
    }
  }, []);

  const handleContainerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      const maxIndex = items.length - 1;
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(key)) return;

      const activeIndex = refs.current.findIndex(
        (node) => node === document.activeElement,
      );

      if (activeIndex === -1) {
        if (key === "ArrowRight" || key === "Home") {
          focusItem(0);
        } else if (key === "ArrowLeft" || key === "End") {
          focusItem(maxIndex);
        }
        event.preventDefault();
        return;
      }

      event.preventDefault();
      if (key === "Home") {
        focusItem(0);
        return;
      }
      if (key === "End") {
        focusItem(maxIndex);
        return;
      }

      const delta = key === "ArrowRight" ? 1 : -1;
      const nextIndex = (activeIndex + delta + items.length) % items.length;
      focusItem(nextIndex);
    },
    [focusItem, items.length],
  );

  const handleSelectAction = useCallback(
    (item: ActionItem) => {
      if (item.navigateTo && location.pathname !== item.navigateTo) {
        navigate(item.navigateTo);
        window.setTimeout(() => {
          item.onSelect?.();
        }, 40);
      } else {
        item.onSelect?.();
      }
    },
    [location.pathname, navigate],
  );

  refs.current.length = items.length;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 ${className}`}
      style={safeAreaStyle}
      role="presentation"
    >
      <div className="pointer-events-auto flex items-end gap-3 w-[min(92vw,720px)]">
        <nav
          className="tabbar-row"
          role="navigation"
          aria-label="Primary navigation"
          onKeyDown={handleContainerKeyDown}
        >
          <div className="tabbar-surface">
            <ul className="tabbar-list">
              {routeItems.map((item, index) => (
                <li key={item.to} className="tabbar-slot">
                  <NavLink
                    ref={(node) => {
                      refs.current[index] = node;
                    }}
                    to={item.to}
                    end={item.to === "/"}
                    aria-label={item.label}
                    className={({ isActive }) =>
                      ["tabbar-item", isActive ? "tabbar-item-active" : "tabbar-item-inactive"].join(
                        " ",
                      )
                    }
                    aria-current={location.pathname.startsWith(item.to) ? "page" : undefined}
                    onKeyDown={(event) => {
                      if (SPACE_KEYS.has(event.key)) {
                        event.preventDefault();
                        event.stopPropagation();
                        (event.currentTarget as HTMLAnchorElement).click();
                      }
                    }}
                  >
                    {({ isActive }) => (
                      <>
                        <span className="icon-wrap">
                          <item.icon
                            size={18}
                            className={isActive ? "tabbar-icon" : "tabbar-icon-inactive"}
                          />
                        </span>
                        <span
                          className={
                            isActive
                              ? "tabbar-label tabbar-label-active"
                              : "tabbar-label tabbar-label-inactive"
                          }
                        >
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {accessoryAction ? (
            <div className="tabbar-accessory-button-wrap">
              <button
                ref={(node) => {
                  refs.current[routeItems.length] = node;
                }}
                type="button"
                className="tabbar-scan"
                aria-label={accessoryAction.ariaLabel ?? accessoryAction.label}
                onClick={() => handleSelectAction(accessoryAction)}
                onKeyDown={(event) => {
                  if (SPACE_KEYS.has(event.key)) {
                    event.preventDefault();
                    event.stopPropagation();
                    handleSelectAction(accessoryAction);
                    return;
                  }
                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    event.stopPropagation();
                    if (routeItems.length > 0) focusItem(routeItems.length - 1);
                    return;
                  }
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    event.stopPropagation();
                    focusItem(0);
                    return;
                  }
                  if (event.key === "Home") {
                    event.preventDefault();
                    event.stopPropagation();
                    focusItem(0);
                    return;
                  }
                  if (event.key === "End") {
                    event.preventDefault();
                    event.stopPropagation();
                    focusItem(routeItems.length);
                  }
                }}
              >
                <span className="tabbar-scan-inner">
                  <accessoryAction.icon size={20} className="tabbar-scan-icon" />
                </span>
                <span className="tabbar-scan-ring" />
              </button>
            </div>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
