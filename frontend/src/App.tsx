import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
              <h1 className="text-3xl font-bold text-slate-900">Welcome to TechForum Pro</h1>
              <p className="mt-4 text-slate-600">Infrastructure recovery complete. System is stable.</p>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;