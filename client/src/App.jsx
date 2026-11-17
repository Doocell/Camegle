import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Room from './pages/Room.jsx';
import { AdminReportsPage } from './features/report/index.js';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/room" element={<Room />} />
        <Route path="/admin" element={<AdminReportsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
