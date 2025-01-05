"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = void 0;
const useAuth = () => {
    const getToken = () => localStorage.getItem("token");
    const setToken = (token) => localStorage.setItem("token", token);
    const removeToken = () => localStorage.removeItem("token");
    return { getToken, setToken, removeToken };
};
exports.useAuth = useAuth;
