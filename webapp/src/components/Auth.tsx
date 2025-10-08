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
import { useSupabase } from "../hooks/useSupabase";

// Fisher-Yates shuffle algorithm
const shuffleArray = (array: string[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const Auth = () => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const supabase = useSupabase();

  useEffect(() => {
    const fetchMovies = async () => {
      const { data, error } = await supabase.from("movies").select("poster_url");
      if (error) {
        console.error("Error fetching movies:", error);
      } else {
        const posters = data.map((movie) => movie.poster_url);
        setImageUrls(shuffleArray(posters));
      }
    };

    fetchMovies();
  }, [supabase]);

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
        <GridMotion items={imageUrls} gradientColor="transparent" />
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
