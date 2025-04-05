import React, { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";

interface SidebarContextProps {
	isLeftSidebarCollapsed: boolean;
	isRightSidebarCollapsed: boolean;
	toggleLeftSidebar: () => void;
	toggleRightSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
	undefined,
);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
	const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
	const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

	const toggleLeftSidebar = () => {
		setIsLeftSidebarCollapsed((prev) => !prev);
	};

	const toggleRightSidebar = () => {
		setIsRightSidebarCollapsed((prev) => !prev);
	};

	return (
		<SidebarContext.Provider
			value={{
				isLeftSidebarCollapsed,
				isRightSidebarCollapsed,
				toggleLeftSidebar,
				toggleRightSidebar,
			}}
		>
			{children}
		</SidebarContext.Provider>
	);
};

export const useSidebar = () => {
	const context = useContext(SidebarContext);
	if (context === undefined) {
		throw new Error("useSidebar must be used within a SidebarProvider");
	}
	return context;
};
