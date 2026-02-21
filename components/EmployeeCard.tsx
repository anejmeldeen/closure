"use client";


import Link from "next/link";


interface EmployeeCardProps {
 id: string;
 name: string;
 role: string;
 status: string;
 statusColor?: "green" | "red" | "yellow" | "gray";
 isInactive?: boolean;
}


export default function EmployeeCard({
 id,
 name,
 role,
 status,
 statusColor = "green",
 isInactive = false,
}: EmployeeCardProps) {
 const statusBgColor = {
   green: "bg-green-100/60 dark:bg-green-950/40",
   red: "bg-red-100/60 dark:bg-red-950/40",
   yellow: "bg-yellow-100/60 dark:bg-yellow-950/40",
   gray: "bg-gray-100/60 dark:bg-gray-700/40",
 }[statusColor];


 const statusTextColor = {
   green: "text-green-700 dark:text-green-400",
   red: "text-red-700 dark:text-red-400",
   yellow: "text-yellow-700 dark:text-yellow-400",
   gray: "text-gray-700 dark:text-gray-300",
 }[statusColor];


 const statusBorderColor = {
   green: "border-green-200 dark:border-green-800",
   red: "border-red-200 dark:border-red-800",
   yellow: "border-yellow-200 dark:border-yellow-800",
   gray: "border-gray-200 dark:border-gray-600",
 }[statusColor];


 return (
   <Link href={`/employee/${id}`}>
     <li
       className={`p-4 bg-linear-to-r from-gray-50 dark:from-gray-800 to-gray-100 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-between items-center transition-all duration-200 cursor-pointer group hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md ${
         isInactive ? "opacity-70 hover:opacity-100" : ""
       }`}
     >
       <div>
         <span className="font-semibold block text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
           {name}
         </span>
         <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
           {role}
         </span>
       </div>
       <span
         className={`text-sm font-semibold ${statusTextColor} ${statusBgColor} px-3 py-1 rounded-full border ${statusBorderColor}`}
       >
         {status}
       </span>
     </li>
   </Link>
 );
}
