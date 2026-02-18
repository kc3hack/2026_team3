import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Register from "./Pages/Register/Register";
import Login from "./Pages/Login/Login";
import Home from "./Pages/Home/Home";
import NFC from "./Pages/NFC/NFC";
import Payment from "./Pages/Payment/Payment";
import Create from "./Pages/Create/Create";

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
          <Route path="/Payment" element={<Payment />} />
          <Route path="/Create" element={<Create />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}


export default App;