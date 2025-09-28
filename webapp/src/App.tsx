import Silk from "./components/Silk";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import styles from "./App.module.css"; // Importar o nosso novo ficheiro CSS

function App() {
  return (
    <>
      {/* Fundo animado (pode manter o estilo inline aqui) */}
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -1,
        }}
      >
        <Silk color="#B22222" />
      </div>

      {/* Container da UI, agora com a classe do nosso ficheiro */}
      <div className={styles.uiContainer}>
        <div className={styles.buttonsWrapper}>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className={styles.button}>Registar</button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className={styles.button}>Entrar</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </>
  );
}

export default App;
