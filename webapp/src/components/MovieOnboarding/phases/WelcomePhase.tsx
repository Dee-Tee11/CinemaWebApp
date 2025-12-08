import React from "react";
import { ChevronRight, Sparkles } from "lucide-react";

interface WelcomePhaseProps {
    onStart: () => void;
}

const WelcomePhase: React.FC<WelcomePhaseProps> = ({ onStart }) => {
    return (
        <div className="onboarding-final-content">
            <div className="welcome-phase">
                <div className="welcome-icon">
                    <Sparkles size={64} color="#991b1b" />
                </div>
                <h1 className="welcome-title">Welcome to Movie Night ! 🎬</h1>
                <p className="welcome-subtitle">
                    Let's personalize your experience with movies you love
                </p>
                <div className="welcome-steps">
                    <div className="welcome-step">
                        <div className="step-number">1</div>
                        <div className="step-text">Choose 5 movies you love</div>
                    </div>
                    <div className="welcome-step">
                        <div className="step-number">2</div>
                        <div className="step-text">Rate some related movies</div>
                    </div>
                    <div className="welcome-step">
                        <div className="step-number">3</div>
                        <div className="step-text">Get personalized recommendations</div>
                    </div>
                </div>
                <button className="onboarding-btn primary" onClick={onStart}>
                    Let's Start <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default WelcomePhase;
