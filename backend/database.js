//PostgreSQL
//connect to db
import pg from "pg";
const db = new pg.Pool({
	user: "postgres",
	host: "localhost",
	database: "budgeting",
	password: "**Caspen1017",
	port: 5432,
});

db.connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch(err => console.error("Connection error", err));

export default db;