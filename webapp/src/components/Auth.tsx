import Silk from "./Silk";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import styles from "./Auth.module.css";
import GridMotion from "./GridMotion";

const Auth = () => {
  return (
    <div
      style={{
        width: "50%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Silk Background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      >
        <Silk color="#DC143C" />
      </div>

      {/* Botões de Autenticação usando os estilos do CSS Module */}
      <div
        className={styles.buttonsWrapper}
        style={{ position: "relative", zIndex: 10 }}
      >
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
          <GridMotion />
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </div>
  );
};

export default Auth;
