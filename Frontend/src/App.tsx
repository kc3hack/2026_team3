import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Register from "./Workspace/Pages/Register/Register";
import Login from "./Workspace/Pages/Login/Login";
import Home from "./Workspace/Pages/Home/Home";
import NFC from "./Workspace/Pages/NFC/NFC";
import Payment from "./Workspace/Pages/Payment/Payment";
import Create from "./Workspace/Pages/Create/Create";

function App() {
  return (
    <>
    <Toaster position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/Home" element={<Home />} />
          <Route path="/NFC" element={<NFC />} />
          <Route path="/Payment/:roomName" element={<Payment />} /> 
          <Route path="/Create" element={<Create />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}


export default App;