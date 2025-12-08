import React from "react";
import { Sparkles } from "lucide-react";

interface CompletePhaseProps {
    onComplete: () => void;
}

const CompletePhase: React.FC<CompletePhaseProps> = ({ onComplete }) => {
    return (
        <div className="onboarding-final-content">
            <div className="welcome-phase">
                <div className="welcome-icon">
                    <Sparkles size={64} color="#22c55e" />
                </div>
                <h1 className="welcome-title">You're all set! 🎉</h1>
                <p className="welcome-subtitle">
                    Your personalized "For You" page is ready with recommendations based on
                    your taste
                </p>
                <button className="onboarding-btn primary" onClick={onComplete}>
                    Explore Movies
                </button>
            </div>
        </div>
    );
};

export default CompletePhase;
