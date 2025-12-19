import React from 'react';
import Logo from '../Logo';
import './InitialLoadingScreen.css';

const InitialLoadingScreen: React.FC = () => {
    return (
        <div className="initial-loading-container">
            <div className="initial-loading-content">
                <div className="logo-wrapper">
                    <Logo width={80} height={80} className="loading-logo" />
                </div>
                <div className="loading-text-container">
                    <h2 className="loading-title">Movie Night</h2>
                    <p className="loading-status">A carregar o seu cinema...</p>
                    <div className="loading-bar">
                        <div className="loading-bar-progress"></div>
                    </div>
                </div>
            </div>
            <div className="loading-bg-gradient"></div>
        </div>
    );
};

export default InitialLoadingScreen;
