import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  // const searchParams = new URL(request.url);
  // const roomId = searchParams.get("roomId");

  const roomId = request.nextUrl.searchParams.get("roomId");

  console.log("Fetching room with ID:", roomId);

  if (!roomId) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
  }

  try {
    const db = await getDb();

    const room = await db.get("SELECT * FROM rooms WHERE id = ?", [roomId]);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Room found, return it
    return NextResponse.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { roomId, type, data } = await request.json();

  console.log("Creating room with ID:", roomId, "of type:", type);

  if (!roomId || !type || !data) {
    return NextResponse.json(
      { error: "Missing required fields: roomId, type, data" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();

    // Insert the new room into the database
    const existingRoom = await db.get(
      "SELECT id FROM rooms WHERE id = ?",
      roomId
    );

    if (existingRoom) {
      let query;
      let params;

      if (type === "offer_ice_candidates" || type === "answer_ice_candidates") {
        query = `
          UPDATE rooms
          SET ${type} = json_insert(
            COALESCE(${type}, '[]'),
            '$[#]',
            json(?)
          )
          WHERE id = ?
        `;
        params = [JSON.stringify(data), roomId];
      } else {
        // Update a simple field like 'offer' or 'answer'
        query = `UPDATE rooms SET ${type} = ? WHERE id = ?`;
        params = [JSON.stringify(data), roomId];
      }

      await db.run(query, ...params);
    } else {
      // room does not exist, so we create a new one

      const field = type;
      const value =
        type === "offer_ice_candidates" || type === "answer_ice_candidates"
          ? JSON.stringify([data]) // Store as a JSON array
          : JSON.stringify(data);

      const query = `INSERT INTO rooms (id, ${field}) VALUES (?, ?)`;
      await db.run(query, roomId, value);
    }
    // Return a success response
    return NextResponse.json(
      { success: true, message: "Data stored successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
