import { useNavigate } from 'react-router-dom';
import AdminSettings from './AdminSettings';

const ControlPanelSettings = () => {
  const navigate = useNavigate();
  
  // Redirect to the dashboard settings tab
  return (
    <div className="page-container min-h-screen">
      <AdminSettings />
    </div>
  );
};

export default ControlPanelSettings;
