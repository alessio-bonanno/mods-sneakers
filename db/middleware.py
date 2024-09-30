from fastapi import Request
import mysql.connector



config = {
    "host": "db",
    "port": 3306,
    "user": "root",
    "autocommit": True, # conn.commit() ❌
    "database": "mods_sneakers"
}

async def handle_db_conn(req: Request, call_next):
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor(dictionary=True)

    req.state.cursor = cursor
    req.state.conn = conn
    response = await call_next(req)

    cursor.close()
    conn.close()
    return response