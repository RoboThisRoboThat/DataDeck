import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ConnectionType, DATABASE_TYPE_MAP } from "../types/connection";
import type {
	Connection,
	MongoDBConnection,
	RedisConnection,
	SQLConnection,
} from "../types/connection";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface Props {
	open: boolean;
	onClose: () => void;
	onAdd: (connection: Connection) => void;
}

export function AddConnectionModal({ open, onClose, onAdd }: Props) {
	const [selectedDbType, setSelectedDbType] = useState<ConnectionType | null>(
		null,
	);
	const [sqlFormData, setSqlFormData] = useState<Omit<SQLConnection, "id">>({
		name: "",
		host: "localhost",
		port: "3306",
		user: "",
		password: "",
		database: "",
		dbType: ConnectionType.MySQL,
	});

	const [mongoFormData, setMongoFormData] = useState<
		Omit<MongoDBConnection, "id">
	>({
		name: "",
		connectionString: "mongodb://localhost:27017",
		dbType: ConnectionType.MongoDB,
	});

	const [redisFormData, setRedisFormData] = useState<
		Omit<RedisConnection, "id">
	>({
		name: "",
		connectionString: "redis://localhost:6379",
		dbType: ConnectionType.Redis,
	});

	const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;

		if (
			selectedDbType === ConnectionType.MySQL ||
			selectedDbType === ConnectionType.Postgres
		) {
			setSqlFormData((prev) => ({
				...prev,
				[name]: value,
			}));
		} else if (selectedDbType === ConnectionType.MongoDB) {
			setMongoFormData((prev) => ({
				...prev,
				[name]: value,
			}));
		} else if (selectedDbType === ConnectionType.Redis) {
			setRedisFormData((prev) => ({
				...prev,
				[name]: value,
			}));
		}
	};

	const handleSqlDbTypeChange = (
		value: ConnectionType.MySQL | ConnectionType.Postgres,
	) => {
		setSqlFormData((prev) => ({
			...prev,
			dbType: value,
			port: value === ConnectionType.MySQL ? "3306" : "5432",
		}));
	};

	const resetForm = () => {
		setSelectedDbType(null);
		setSqlFormData({
			name: "",
			host: "localhost",
			port: "3306",
			user: "",
			password: "",
			database: "",
			dbType: ConnectionType.MySQL,
		});
		setMongoFormData({
			name: "",
			connectionString: "mongodb://localhost:27017",
			dbType: ConnectionType.MongoDB,
		});
		setRedisFormData({
			name: "",
			connectionString: "redis://localhost:6379",
			dbType: ConnectionType.Redis,
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		let newConnection: Connection;

		if (
			selectedDbType === ConnectionType.MySQL ||
			selectedDbType === ConnectionType.Postgres
		) {
			newConnection = {
				id: uuidv4(),
				...sqlFormData,
			};
		} else if (selectedDbType === ConnectionType.MongoDB) {
			newConnection = {
				id: uuidv4(),
				...mongoFormData,
			};
		} else if (selectedDbType === ConnectionType.Redis) {
			newConnection = {
				id: uuidv4(),
				...redisFormData,
			};
		} else {
			return;
		}

		onAdd(newConnection);
		resetForm();
		onClose();
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	const renderDatabaseTypeSelector = () => (
		<div className="grid grid-cols-2 gap-4">
			{Object.entries(DATABASE_TYPE_MAP).map(([type, info]) => {
				const Icon = info.icon;
				return (
					<button
						key={type}
						type="button"
						onClick={() => setSelectedDbType(type as ConnectionType)}
						className="flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
					>
						<Icon className={`h-10 w-10 ${info.iconColor}`} />
						<h3 className="mt-2 font-medium">{info.name}</h3>
						<p className="text-xs text-muted-foreground mt-1 text-center">
							{info.description}
						</p>
					</button>
				);
			})}
		</div>
	);

	const renderSqlForm = () => (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid w-full gap-1.5">
				<Label htmlFor="name">Connection Name</Label>
				<Input
					id="name"
					name="name"
					value={sqlFormData.name}
					onChange={handleTextChange}
					required
				/>
			</div>

			<div className="grid w-full gap-1.5">
				<Label htmlFor="dbType">Database Type</Label>
				<Select
					value={sqlFormData.dbType}
					onValueChange={handleSqlDbTypeChange}
				>
					<SelectTrigger id="dbType">
						<SelectValue placeholder="Select database type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ConnectionType.MySQL}>MySQL</SelectItem>
						<SelectItem value={ConnectionType.Postgres}>PostgreSQL</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid w-full gap-1.5">
				<Label htmlFor="host">Host</Label>
				<Input
					id="host"
					name="host"
					value={sqlFormData.host}
					onChange={handleTextChange}
					required
				/>
			</div>

			<div className="grid w-full gap-1.5">
				<Label htmlFor="port">Port</Label>
				<Input
					id="port"
					name="port"
					value={sqlFormData.port}
					onChange={handleTextChange}
					required
				/>
			</div>

			<div className="grid w-full gap-1.5">
				<Label htmlFor="user">Username</Label>
				<Input
					id="user"
					name="user"
					value={sqlFormData.user}
					onChange={handleTextChange}
					required
				/>
			</div>

			<div className="grid w-full gap-1.5">
				<Label htmlFor="password">Password</Label>
				<Input
					id="password"
					name="password"
					type="password"
					value={sqlFormData.password}
					onChange={handleTextChange}
					required
				/>
			</div>

			<div className="grid w-full gap-1.5">
				<Label htmlFor="database">Database</Label>
				<Input
					id="database"
					name="database"
					value={sqlFormData.database}
					onChange={handleTextChange}
					required
				/>
			</div>

			<DialogFooter className="mt-4 sm:justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={() => setSelectedDbType(null)}
				>
					Back
				</Button>
				<div>
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						className="mr-2"
					>
						Cancel
					</Button>
					<Button type="submit">Add Connection</Button>
				</div>
			</DialogFooter>
		</form>
	);

	const renderMongoDBForm = () => (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid w-full gap-1.5">
				<Label htmlFor="name">Connection Name</Label>
				<Input
					id="name"
					name="name"
					value={mongoFormData.name}
					onChange={handleTextChange}
					required
				/>
			</div>

			<div className="grid w-full gap-1.5">
				<Label htmlFor="connectionString">Connection String</Label>
				<Input
					id="connectionString"
					name="connectionString"
					value={mongoFormData.connectionString}
					onChange={handleTextChange}
					required
				/>
				<p className="text-xs text-muted-foreground mt-1">
					Example: mongodb://username:password@localhost:27017/dbname
				</p>
			</div>

			<DialogFooter className="mt-4 sm:justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={() => setSelectedDbType(null)}
				>
					Back
				</Button>
				<div>
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						className="mr-2"
					>
						Cancel
					</Button>
					<Button type="submit">Add Connection</Button>
				</div>
			</DialogFooter>
		</form>
	);

	const renderRedisForm = () => (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid w-full gap-1.5">
				<Label htmlFor="name">Connection Name</Label>
				<Input
					id="name"
					name="name"
					value={redisFormData.name}
					onChange={handleTextChange}
					required
				/>
			</div>

			<div className="grid w-full gap-1.5">
				<Label htmlFor="connectionString">Connection String</Label>
				<Input
					id="connectionString"
					name="connectionString"
					value={redisFormData.connectionString}
					onChange={handleTextChange}
					required
				/>
				<p className="text-xs text-muted-foreground mt-1">
					Example: redis://username:password@localhost:6379/0
				</p>
			</div>

			<DialogFooter className="mt-4 sm:justify-between">
				<Button
					type="button"
					variant="outline"
					onClick={() => setSelectedDbType(null)}
				>
					Back
				</Button>
				<div>
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						className="mr-2"
					>
						Cancel
					</Button>
					<Button type="submit">Add Connection</Button>
				</div>
			</DialogFooter>
		</form>
	);

	const renderForm = () => {
		if (!selectedDbType) {
			return renderDatabaseTypeSelector();
		}

		switch (selectedDbType) {
			case ConnectionType.MySQL:
			case ConnectionType.Postgres:
				return renderSqlForm();
			case ConnectionType.MongoDB:
				return renderMongoDBForm();
			case ConnectionType.Redis:
				return renderRedisForm();
			default:
				return renderDatabaseTypeSelector();
		}
	};

	return (
		<Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{selectedDbType
							? `Add ${DATABASE_TYPE_MAP[selectedDbType].name} Connection`
							: "Select Database Type"}
					</DialogTitle>
				</DialogHeader>
				{renderForm()}
			</DialogContent>
		</Dialog>
	);
}
