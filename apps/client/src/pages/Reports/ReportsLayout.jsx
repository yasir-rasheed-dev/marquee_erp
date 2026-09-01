// src/pages/Reports/ReportsLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';

const ReportsLayout = () => {
  return (
    <div className="w-full">
      <Outlet />
    </div>
  );
};

export default ReportsLayout;