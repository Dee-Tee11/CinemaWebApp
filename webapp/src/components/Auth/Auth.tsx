import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import styles from "./Auth.module.css";
import GridMotion from "../GridMotion/GridMotion";



const Auth = () => {
  return (
    <div
      style={{
        width: "50%",
        position: "relative",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* GridMotion Background */}
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
        <GridMotion gradientColor="transparent" />
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
