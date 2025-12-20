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
import Logo from "../Logo";

const Auth = () => {
  const { items, isLoading } = useGridMovies();

  return (
    <div className={styles.authContainer}>
      {/* GridMotion Background with movie posters */}
      <div className={styles.backgroundWrapper}>
        {!isLoading ? (
          <GridMotion gradientColor="transparent" items={items} />
        ) : (
          <div className={styles.loadingState}>
            Loading movies...
          </div>
        )}
      </div>

      {/* Authentication Buttons */}
      <div className={styles.uiContainer}>
        <div className={styles.buttonsWrapper}>
          {/* Logo and Title */}
          <div className={styles.authHeader}>
            <div className={styles.authLogo}>
              <Logo />
            </div>
            <h1 className={styles.authTitle}>Movie Night</h1>
          </div>

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
