import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import React, { useState, useEffect } from "react";
import styles from "./Auth.module.css";
import GridMotion from "./GridMotion";

const imageModules = import.meta.glob("/src/assets/**/*.{jpg,jpeg,png,gif}");
const imageUrls = Object.keys(imageModules);

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: string[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const Auth = () => {
  const [shuffledImageUrls, setShuffledImageUrls] = useState<string[]>([]);

  useEffect(() => {
    setShuffledImageUrls(shuffleArray([...imageUrls]));
  }, []);

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
        <GridMotion items={shuffledImageUrls} gradientColor="transparent" />
      </div>

      {/* Botões de Autenticação */}
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
