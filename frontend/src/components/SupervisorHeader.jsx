import { useEffect, useState } from "react";
import api from "../services/api";

function SupervisorHeader() {

    const [userName, setUserName] = useState("Supervisor");

    useEffect(() => {
        let isMounted = true;

        const loadUserName = async () => {
            try {
                const response = await api.get("/dashboard-header");

                const firstName = response.data.first_name || "";
                const lastName = response.data.last_name || "";

                const fullName = `${firstName} ${lastName}`.trim();

                if (isMounted) {
                    setUserName(fullName || "Supervisor");
                }
            } catch (error) {
                console.error("Error loading logged-in supervisor:", error);
            }
        };

        loadUserName();

        return () => {
            isMounted = false;
        };
    }, []);
    return (

        <div className="header">

            <div>

                <h1>
                    Welcome, {userName}
                </h1>

                <p>
                    Factory Supervisor Dashboard
                </p>

                <span>
                    Monitor production performance, product quality, inspection reports, and factory operations in real time.
                </span>

            </div>


        </div>

    );
}

export default SupervisorHeader;