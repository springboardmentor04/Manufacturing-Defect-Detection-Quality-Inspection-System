import {
    Camera,
    ScanSearch,
    Box,
    Sparkles
} from "lucide-react";

function AnimatedBackground() {

    return (

        <div className="animated-bg">

            {/* Grid */}

            <div className="grid"></div>

            {/* Camera */}

            <div className="floating camera">

                <Camera size={70} />

            </div>

            {/* Product */}

            <div className="floating product">

                <Box size={75} />

            </div>

            {/* Scanner */}

            <div className="floating scanner">

                <ScanSearch size={65} />

            </div>

            {/* AI Spark */}

            <div className="floating spark">

                <Sparkles size={42} />

            </div>

            {/* Animated Nodes */}

            <span className="node n1"></span>
            <span className="node n2"></span>
            <span className="node n3"></span>
            <span className="node n4"></span>
            <span className="node n5"></span>

            {/* Connection Lines */}

            <div className="line l1"></div>
            <div className="line l2"></div>
            <div className="line l3"></div>

        </div>

    );

}

export default AnimatedBackground;