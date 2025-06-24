import DashboardHeader from "../components/DashboardHeader";
import {Upcoming, SummaryExpenses} from "../components/DashboardSummary";

const Dashboard = () => {
    return (
        <div className="dashboard">
            <DashboardHeader />
            <SummaryExpenses />
            <h2 className="tac">Upcoming:</h2>
            <Upcoming />
        </div>
    );
};

export default Dashboard;