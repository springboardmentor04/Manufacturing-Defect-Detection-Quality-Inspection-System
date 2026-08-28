import {
    Factory,
    Cpu,
    BadgeCheck,
    Activity
} from "lucide-react";

import AnimatedBackground from "./AnimatedBackground";
import StatCard from "./StatCard";

import "../styles/AuthLayout.css";

function AuthLayout({ title, subtitle, children }) {

    return (

        <div className="auth-container">

            {/* LEFT PANEL */}

            <div className="left-section">

                {/* Static Logo */}

                <div className="corner-logo">
                    <Cpu size={60} />
                </div>

                {/* Background Animation */}

                <AnimatedBackground />

                <div className="overlay">

                    {/* AI Status */}

                    <div className="status-badge">
                        <span className="status-dot"></span>
                        AI ONLINE
                    </div>

                    {/* Brand */}

                    <div className="brand">

                        <Factory size={42} />

                        <div>

                            <h1>VisionInspect AI</h1>

                            <p>
                                AI-Powered Product Quality Inspection
                            </p>

                        </div>

                    </div>

                    {/* Description */}

                    <div className="objective-card">

                        <h3>
                            Intelligent Manufacturing Inspection
                        </h3>

                        <p>

                            Detect <strong>product defects</strong>,
                            classify quality issues and automate
                            manufacturing inspection using
                            Computer Vision and Artificial Intelligence.

                        </p>

                        <div className="feature-grid">

                            <div>✓ Product Inspection</div>

                            <div>✓ Defect Detection</div>

                            <div>✓ Quality Classification</div>

                            <div>✓ Production Analytics</div>

                        </div>

                    </div>

                    {/* KPI */}

                    <div className="stats">

                        <StatCard

                            icon={<BadgeCheck color="#22C55E" />}

                            value="98.7%"

                            title="Detection Accuracy"

                            subtitle="Live AI Inspection"

                        />

                        <StatCard

                            icon={<Activity color="#F97316" />}

                            value="0.21 sec"

                            title="Average Inspection"

                            subtitle="Per Product"

                        />

                    </div>

                    {/* Quote */}

                    <div className="quote">
                        "Ensuring manufacturing excellence through intelligent
                        product inspection."
                    </div>

                </div>

            </div>

            {/* RIGHT PANEL */}

            <div className="right-section">

                <div className="form-card">

                    <div className="form-header">

                        <h2>{title}</h2>

                        <p>{subtitle}</p>

                    </div>

                    {children}

                </div>

            </div>

        </div>

    );

}

export default AuthLayout;