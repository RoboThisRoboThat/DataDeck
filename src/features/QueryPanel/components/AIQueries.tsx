import { FiZap } from "react-icons/fi";

const AIQueries = () => {
	return (
		<div className="p-4">
			<div className="flex flex-col items-center justify-center py-8 text-center">
				<FiZap size={36} className="text-indigo-400 mb-3" />
				<p className="text-gray-600 mb-1 font-medium">AI-Powered Queries</p>
				<p className="text-gray-500 max-w-xs">
					Coming soon! Use AI to generate SQL queries for your database.
				</p>
			</div>
		</div>
	);
};

export default AIQueries;
