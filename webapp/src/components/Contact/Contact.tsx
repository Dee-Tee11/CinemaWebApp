import { X, Mail, ExternalLink } from "lucide-react";
import "./Contact.css";

interface ContactProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Contact({ isOpen, onClose }: ContactProps) {
    if (!isOpen) return null;

    return (
        <>
            <div className="contact-backdrop" onClick={onClose} />
            <div className="contact-modal">
                <div className="contact-header">
                    <div className="header-title">
                        <Mail size={24} className="contact-icon" />
                        <h2>Contact & Support</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="shared-close-button"
                        aria-label="Close"
                        type="button"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="contact-content">
                    <div className="contact-intro">
                        <p>
                            Have suggestions, found a bug, or want to discuss a project?
                            Feel free to reach out directly!
                        </p>
                        <a
                            href="https://diogo-portofolio.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="portfolio-link"
                        >
                            <ExternalLink size={18} />
                            View Full Portfolio
                        </a>
                    </div>

                    <div className="contact-info-section">
                        <p className="contact-info-title">Contact me directly:</p>
                        <div className="contact-info-links">
                            <a
                                href="mailto:diogoluisteixeira@gmail.com"
                                className="contact-info-link"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Mail size={20} />
                                <span>diogoluisteixeira@gmail.com</span>
                            </a>
                            <a
                                href="mailto:pedronevespnf@gmail.com"
                                className="contact-info-link"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Mail size={20} />
                                <span>pedronevespnf@gmail.com</span>
                            </a>
                            <a
                                href="https://www.linkedin.com/in/diogo-teixeira/"
                                className="contact-info-link"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink size={20} />
                                <span>LinkedIn Profile</span>
                            </a>
                            <a
                                href="https://github.com/Dee-Tee11"
                                className="contact-info-link"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink size={20} />
                                <span>GitHub Repository</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

