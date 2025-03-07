"use client"

import { useState, useEffect } from 'react';
import { 
    ClipboardDocumentListIcon, 
    UsersIcon, 
    ShoppingBagIcon, 
    Cog6ToothIcon 
} from "@heroicons/react/24/outline";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Image from "next/image";

// Mock data - replace with actual API fetch in real implementation
const mockOrders = [
    { id: 'ORD001', customer: 'John Doe', date: '2023-10-15', total: 79.99, status: 'Delivered' },
    { id: 'ORD002', customer: 'Jane Smith', date: '2023-10-16', total: 129.50, status: 'Processing' },
    { id: 'ORD003', customer: 'Bob Johnson', date: '2023-10-17', total: 56.25, status: 'Pending' },
    { id: 'ORD004', customer: 'Alice Brown', date: '2023-10-18', total: 210.00, status: 'Shipped' },
    { id: 'ORD005', customer: 'Chris Evans', date: '2023-10-19', total: 89.99, status: 'Canceled' },
];

const mockUsers = [
    { id: 'USR001', name: 'John Doe', email: 'john@example.com', joinDate: '2023-09-10', orders: 3 },
    { id: 'USR002', name: 'Jane Smith', email: 'jane@example.com', joinDate: '2023-09-12', orders: 5 },
    { id: 'USR003', name: 'Bob Johnson', email: 'bob@example.com', joinDate: '2023-09-15', orders: 1 },
    { id: 'USR004', name: 'Alice Brown', email: 'alice@example.com', joinDate: '2023-09-20', orders: 2 },
];

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState("dashboard");
    
    const buttonStyling = "flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border-2 border-gray-100 transition-all duration-200";
    const inputStyling = "block w-full bg-black pl-2 rounded-md border-2 py-1.5 px-1 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6";
    
    // Dashboard tab content
    const dashboardTab = (
        <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { title: "Total Orders", value: "125", icon: "📦", color: "bg-blue-500/20 border-blue-500/40" },
                    { title: "Total Revenue", value: "$12,543", icon: "💰", color: "bg-green-500/20 border-green-500/40" },
                    { title: "Active Users", value: "832", icon: "👥", color: "bg-purple-500/20 border-purple-500/40" },
                    { title: "Pending Orders", value: "15", icon: "⏱️", color: "bg-yellow-500/20 border-yellow-500/40" }
                ].map((stat, idx) => (
                    <div key={idx} className={`${stat.color} p-6 rounded-lg border shadow-md flex items-center justify-between`}>
                        <div>
                            <p className="text-gray-400 text-sm font-medium">{stat.title}</p>
                            <h3 className="text-white text-2xl font-bold mt-1">{stat.value}</h3>
                        </div>
                        <div className="text-3xl">{stat.icon}</div>
                    </div>
                ))}
            </div>
            
            <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md mb-8">
                <h3 className="text-xl font-medium text-white mb-4">Recent Orders</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {mockOrders.slice(0, 3).map((order) => (
                                <tr key={order.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.customer}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${order.total.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 text-right">
                    <button 
                        onClick={() => setActiveTab("orders")}
                        className="text-red-500 hover:text-red-400 text-sm font-medium"
                    >
                        View all orders →
                    </button>
                </div>
            </div>
        </div>
    );

    // Orders tab content
    const ordersTab = (
        <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Order Management</h2>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Search orders..."
                        className={inputStyling}
                    />
                    <button className={buttonStyling}>Search</button>
                </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg border border-gray-800 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                            <tr className="bg-gray-800/50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {mockOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.customer}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{order.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${order.total.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button 
                                            onClick={() => alert(`View order ${order.id}`)}
                                            className="text-red-500 hover:text-red-400 mr-3"
                                        >
                                            View
                                        </button>
                                        <button 
                                            onClick={() => alert(`Edit order ${order.id}`)}
                                            className="text-blue-500 hover:text-blue-400"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 flex items-center justify-between border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                        Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">42</span> results
                    </div>
                    <div className="flex space-x-2">
                        <button className="px-3 py-1 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700">Previous</button>
                        <button className="px-3 py-1 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Users tab content
    const usersTab = (
        <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Search users..."
                        className={inputStyling}
                    />
                    <button className={buttonStyling}>Search</button>
                </div>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg border border-gray-800 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                            <tr className="bg-gray-800/50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Join Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Orders</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {mockUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.joinDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.orders}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button 
                                            onClick={() => alert(`View user ${user.id}`)}
                                            className="text-red-500 hover:text-red-400 mr-3"
                                        >
                                            View
                                        </button>
                                        <button 
                                            onClick={() => alert(`Edit user ${user.id}`)}
                                            className="text-blue-500 hover:text-blue-400"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 flex items-center justify-between border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                        Showing <span className="font-medium">1</span> to <span className="font-medium">4</span> of <span className="font-medium">24</span> results
                    </div>
                    <div className="flex space-x-2">
                        <button className="px-3 py-1 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700">Previous</button>
                        <button className="px-3 py-1 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Settings tab content
    const settingsTab = (
        <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Admin Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
                <div className="md:col-span-3">
                    <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md mb-6">
                        <h3 className="text-xl font-medium text-white mb-4">Site Configuration</h3>
                        <form className="space-y-4">
                            <div>
                                <label htmlFor="site-title" className="block text-sm font-medium text-gray-300 mb-1">
                                    Site Title
                                </label>
                                <input
                                    type="text"
                                    id="site-title"
                                    defaultValue="RAGESTATE"
                                    className={inputStyling}
                                />
                            </div>
                            <div>
                                <label htmlFor="site-description" className="block text-sm font-medium text-gray-300 mb-1">
                                    Site Description
                                </label>
                                <textarea
                                    id="site-description"
                                    defaultValue="Official RAGESTATE website"
                                    rows={3}
                                    className={inputStyling}
                                />
                            </div>
                            <div>
                                <label htmlFor="contact-email" className="block text-sm font-medium text-gray-300 mb-1">
                                    Contact Email
                                </label>
                                <input
                                    type="email"
                                    id="contact-email"
                                    defaultValue="contact@ragestate.com"
                                    className={inputStyling}
                                />
                            </div>
                            <div className="pt-2">
                                <button type="button" className={buttonStyling}>
                                    Save Settings
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
                        <h3 className="text-lg font-medium text-gray-100 mb-4">Admin Users</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center justify-between p-2 border-b border-gray-700">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold mr-3">A</div>
                                    <div>
                                        <p className="text-gray-200 font-medium">Admin User</p>
                                        <p className="text-gray-400 text-sm">admin@ragestate.com</p>
                                    </div>
                                </div>
                                <span className="text-green-500 text-sm font-medium">Super Admin</span>
                            </li>
                            <li className="flex items-center justify-between p-2 border-b border-gray-700">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">M</div>
                                    <div>
                                        <p className="text-gray-200 font-medium">Moderator</p>
                                        <p className="text-gray-400 text-sm">mod@ragestate.com</p>
                                    </div>
                                </div>
                                <span className="text-blue-500 text-sm font-medium">Moderator</span>
                            </li>
                        </ul>
                        <button className="mt-4 w-full flex justify-center items-center bg-transparent text-gray-300 border border-gray-700 hover:border-gray-500 font-medium py-1.5 px-4 rounded-md text-sm transition-colors">
                            Manage Admin Users
                        </button>
                    </div>
                    
                    <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
                        <h3 className="text-lg font-medium text-gray-100 mb-3">System Status</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Server Status</span>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500">Online</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Database</span>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-500">Connected</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Last Backup</span>
                                <span className="text-sm text-gray-400">2 hours ago</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Storage Usage</span>
                                <span className="text-sm text-gray-400">45% (45GB/100GB)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Map tabs to their components
    const tabComponents = {
        dashboard: dashboardTab,
        orders: ordersTab,
        users: usersTab,
        settings: settingsTab,
    };

    return (
        <div className="bg-black min-h-screen">
            <Header />

            <main className="flex-grow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
                    <div className="max-w-6xl mx-auto">
                        {/* Admin Header */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="flex justify-center mt-6 mb-4">
                                <img 
                                    src="/assets/RSLogo2.png" 
                                    alt="RAGESTATE" 
                                    className="h-14 w-auto" 
                                />
                            </div>
                            <h1 className="text-3xl font-bold leading-tight text-white text-center">
                                Admin Dashboard
                            </h1>
                            <p className="mt-2 text-gray-400 text-center max-w-2xl">
                                Manage orders, users, and site settings in one place.
                            </p>
                        </div>

                        {/* Admin Navigation Tabs */}
                        <div className="mt-6 mb-8">
                            <div className="border-b border-zinc-700">
                                <nav className="-mb-px flex space-x-8 overflow-x-auto px-1 justify-center" aria-label="Tabs">
                                    <button
                                        onClick={() => setActiveTab("dashboard")}
                                        className={`${
                                            activeTab === "dashboard"
                                                ? "border-red-700 text-red-500"
                                                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                                    >
                                        <ClipboardDocumentListIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("orders")}
                                        className={`${
                                            activeTab === "orders"
                                                ? "border-red-700 text-red-500"
                                                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                                    >
                                        <ShoppingBagIcon
                                            className="h-5 w-5 mr-2"
                                            aria-hidden="true"
                                        />
                                        Orders
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("users")}
                                        className={`${
                                            activeTab === "users"
                                                ? "border-red-700 text-red-500"
                                                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                                    >
                                        <UsersIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                                        Users
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("settings")}
                                        className={`${
                                            activeTab === "settings"
                                                ? "border-red-700 text-red-500"
                                                : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                                    >
                                        <Cog6ToothIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                                        Settings
                                    </button>
                                </nav>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="mb-16">{tabComponents[activeTab]}</div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

function getStatusColor(status) {
    switch (status) {
        case 'Delivered': return 'bg-green-500/20 text-green-500';
        case 'Processing': return 'bg-blue-500/20 text-blue-500';
        case 'Pending': return 'bg-yellow-500/20 text-yellow-500';
        case 'Shipped': return 'bg-indigo-500/20 text-indigo-500';
        case 'Canceled': return 'bg-red-500/20 text-red-500';
        default: return 'bg-gray-500/20 text-gray-500';
    }
}