import { Outlet, Link, useLocation } from "react-router-dom";
import { navbarStyles } from "./AppShell.styles";
import { colors } from "../styles/colors";

export default function AppShell() {
  const location = useLocation();

  return (
    <div style={navbarStyles.body}>
      <nav style={navbarStyles.navbar}>
        <Link to="/" style={navbarStyles.logo}>
          WildSight
        </Link>

        <div style={navbarStyles.navLinks}>
          <Link
            to="/"
            style={{
              ...navbarStyles.link,
              color: location.pathname === "/" ? navbarStyles.linkHover.color : colors.cream,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = navbarStyles.linkHover.color!)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                location.pathname === "/" ? navbarStyles.linkHover.color! : colors.cream)
            }
          >
            Home
          </Link>

          <Link
            to="/about"
            style={{
              ...navbarStyles.link,
              color:
                location.pathname.startsWith("/about") ||
                location.pathname === "/about"
                  ? navbarStyles.linkHover.color
                  : colors.cream,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = navbarStyles.linkHover.color!)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                location.pathname.startsWith("/about") ? navbarStyles.linkHover.color! : colors.cream)
            }
          >
            About
          </Link>

          <Link
            to="/wildfiremap"
            style={{
              ...navbarStyles.link,
              color: location.pathname === "/wildfiremap" ? navbarStyles.linkHover.color : colors.cream,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = navbarStyles.linkHover.color!)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                location.pathname === "/wildfiremap"
                  ? navbarStyles.linkHover.color!
                  : colors.cream)
            }
          >
            Map
          </Link>

          <Link
            to="/modeltest"
            style={{
              ...navbarStyles.link,
              color:
                location.pathname === "/modeltest"
                  ? navbarStyles.linkHover.color
                  : colors.cream,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = navbarStyles.linkHover.color!)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color =
                location.pathname === "/modeltest"
                  ? navbarStyles.linkHover.color!
                  : colors.cream)
            }
          >
            API Test
          </Link>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
