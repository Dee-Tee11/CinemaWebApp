import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import styles from "./Auth.module.css";
import GridMotion from "../GridMotion/GridMotion";
import { useGridMovies } from "../../hooks/useGridMovies";

const Auth: React.FC = () => {
  const { items, isLoading } = useGridMovies();

  return (
    <div
      style={{
        width: "50%",
        position: "relative",
        height: "100vh",
        overflow: "hidden",
      }}
      className={styles.authContainer}
    >
      {/* GridMotion Background with movie posters */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          backgroundColor: "#8b0000",
        }}
      >
        {!isLoading ? (
          <GridMotion gradientColor="transparent" items={items} />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "white",
              fontSize: "1.2rem",
            }}
          >
            Loading movies...
          </div>
        )}
      </div>

      {/* Authentication Buttons */}
      <div className={styles.uiContainer}>
        <div className={styles.buttonsWrapper}>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className={`${styles.button} ${styles.primary}`}>
                Sign Up
              </button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button className={`${styles.button} ${styles.secondary}`}>
                Sign In
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </div>
  );
};

export default Auth;