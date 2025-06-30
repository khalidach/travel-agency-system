// frontend/src/pages/RoomManage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../services/api";
import { Program, Room, Occupant } from "../context/models";
import {
  ChevronLeft,
  ChevronRight,
  Hotel,
  Plus,
  Save,
  Users,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Modal from "../components/Modal";
import OccupantSearchBox from "../components/room/OccupantSearchBox";

type MovePersonState = {
  occupant: Occupant;
  fromRoomName: string;
} | null;

export default function RoomManage() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [hotels, setHotels] = useState<string[]>([]);
  const [currentHotelIndex, setCurrentHotelIndex] = useState(0);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const [newRoomDetails, setNewRoomDetails] = useState({ name: "", type: "" });
  const [movePersonState, setMovePersonState] = useState<MovePersonState>(null);

  const currentHotelName = hotels[currentHotelIndex];

  // Data Fetching
  const { data: program, isLoading: isLoadingProgram } = useQuery<Program>({
    queryKey: ["program", programId],
    queryFn: () => api.getProgramById(programId!),
    enabled: !!programId,
  });

  const { data: initialRooms, isLoading: isLoadingRooms } = useQuery<Room[]>({
    queryKey: ["rooms", programId, currentHotelName],
    queryFn: () => api.getRooms(programId!, currentHotelName),
    enabled: !!programId && !!currentHotelName,
  });

  const { mutate: saveRooms, isPending: isSaving } = useMutation({
    mutationFn: (newRooms: Room[]) =>
      api.saveRooms(programId!, currentHotelName, newRooms),
    onSuccess: (data) => {
      toast.success("Room assignments saved!");
      queryClient.setQueryData(["rooms", programId, currentHotelName], data);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save rooms.");
    },
  });

  // Derived State
  const groupedRooms = useMemo(() => {
    return rooms.reduce((acc, room) => {
      if (!acc[room.type]) {
        acc[room.type] = [];
      }
      acc[room.type].push(room);
      return acc;
    }, {} as Record<string, Room[]>);
  }, [rooms]);

  const roomTypesInProgram = useMemo(() => {
    if (!program) return new Map<string, number>();
    const types = new Map<string, number>();
    program.packages.forEach((p) =>
      p.prices.forEach((price) =>
        price.roomTypes.forEach((rt) => {
          if (!types.has(rt.type)) {
            types.set(rt.type, rt.guests);
          }
        })
      )
    );
    return types;
  }, [program]);

  // Effects
  useEffect(() => {
    if (program) {
      const hotelSet = new Set<string>();
      program.packages.forEach((pkg) => {
        Object.values(pkg.hotels).forEach((hotelList) => {
          hotelList.forEach((hotelName) => {
            if (hotelName) hotelSet.add(hotelName);
          });
        });
      });
      setHotels(Array.from(hotelSet));
    }
  }, [program]);

  useEffect(() => {
    if (initialRooms) {
      const sanitizedRooms = initialRooms.map((room) => ({
        ...room,
        occupants: Array.from(
          { length: room.capacity },
          (_, i) => room.occupants[i] || null
        ),
      }));
      setRooms(sanitizedRooms);
    }
  }, [initialRooms]);

  // Handlers
  const handleNextHotel = () =>
    setCurrentHotelIndex((prev) => (prev + 1) % hotels.length);
  const handlePrevHotel = () =>
    setCurrentHotelIndex((prev) => (prev - 1 + hotels.length) % hotels.length);

  const handleAssignOccupant = (
    roomName: string,
    slotIndex: number,
    occupant: Occupant
  ) => {
    setRooms((currentRooms) => {
      const newRooms = JSON.parse(JSON.stringify(currentRooms));
      const room = newRooms.find((r: Room) => r.name === roomName);
      if (room) {
        room.occupants[slotIndex] = occupant;
      }
      return newRooms;
    });
    queryClient.invalidateQueries({ queryKey: ["unassignedOccupantsSearch"] });
  };

  const handleUnassignOccupant = (roomName: string, slotIndex: number) => {
    setRooms((currentRooms) => {
      const newRooms = JSON.parse(JSON.stringify(currentRooms));
      const room = newRooms.find((r: Room) => r.name === roomName);
      if (room) {
        room.occupants[slotIndex] = null;
      }
      return newRooms;
    });
    queryClient.invalidateQueries({ queryKey: ["unassignedOccupantsSearch"] });
  };

  const handleMoveOccupant = (occupant: Occupant, fromRoomName: string) => {
    setMovePersonState({ occupant, fromRoomName });
  };

  const executeMove = (toRoomName: string) => {
    if (!movePersonState) return;
    const { occupant, fromRoomName } = movePersonState;

    setRooms((currentRooms) => {
      const newRooms = JSON.parse(JSON.stringify(currentRooms));
      const fromRoom = newRooms.find((r: Room) => r.name === fromRoomName);
      const toRoom = newRooms.find((r: Room) => r.name === toRoomName);

      if (fromRoom && toRoom) {
        const emptySlotIndex = toRoom.occupants.findIndex(
          (occ: Occupant | null) => occ === null
        );
        if (emptySlotIndex === -1) {
          toast.error("The destination room is full.");
          return currentRooms;
        }
        const occupantIndex = fromRoom.occupants.findIndex(
          (occ: Occupant | null) => occ && occ.id === occupant.id
        );
        if (occupantIndex > -1) {
          fromRoom.occupants[occupantIndex] = null;
          toRoom.occupants[emptySlotIndex] = occupant;
        }
      }
      return newRooms;
    });
    setMovePersonState(null);
  };

  const handleAddNewRoom = () => {
    if (!newRoomDetails.name || !newRoomDetails.type) {
      toast.error("Room name and type are required.");
      return;
    }
    const capacity = roomTypesInProgram.get(newRoomDetails.type) || 0;
    const newRoom: Room = {
      name: newRoomDetails.name,
      type: newRoomDetails.type,
      capacity: capacity,
      occupants: Array(capacity).fill(null),
    };
    setRooms([...rooms, newRoom]);
    setIsNewRoomModalOpen(false);
    setNewRoomDetails({ name: "", type: "" });
  };

  const handleDeleteRoom = (roomName: string) => {
    const roomToDelete = rooms.find((r) => r.name === roomName);
    if (roomToDelete && roomToDelete.occupants.some((o) => o !== null)) {
      toast.error(
        "Cannot delete a room with occupants. Please move them first."
      );
      return;
    }
    setRooms(rooms.filter((r) => r.name !== roomName));
  };

  if (isLoadingProgram || isLoadingRooms) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/room-management")}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          >
            <ChevronLeft />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {program?.name} - Room Management
            </h1>
            <div className="flex items-center gap-2 text-gray-600 mt-2">
              <Hotel />
              <h2 className="text-xl font-semibold">{currentHotelName}</h2>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hotels.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevHotel}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ChevronLeft />
              </button>
              <span>
                {currentHotelIndex + 1} / {hotels.length}
              </span>
              <button
                onClick={handleNextHotel}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <ChevronRight />
              </button>
            </div>
          )}
          <button
            onClick={() =>
              saveRooms(
                rooms.map((r) => ({
                  ...r,
                  occupants: r.occupants.filter((o) => o),
                }))
              )
            }
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl"
          >
            <Save className="mr-2" /> {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {Object.entries(groupedRooms).map(([type, roomsInType]) => (
          <div key={type} className="col-span-1 space-y-4">
            <h3 className="text-center font-bold text-xl">{type}</h3>
            {roomsInType.map((room) => (
              <div
                key={room.name}
                className="bg-white p-4 rounded-lg shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">{room.name}</h4>
                  <div className="flex items-center">
                    <Users size={16} className="mr-1" />
                    <span>
                      {room.occupants.filter((o) => o).length}/{room.capacity}
                    </span>
                    <button
                      onClick={() => handleDeleteRoom(room.name)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: room.capacity }).map((_, i) => (
                    <OccupantSearchBox
                      key={i}
                      programId={programId!}
                      hotelName={currentHotelName}
                      assignedOccupant={room.occupants[i]}
                      onAssign={(occ) =>
                        handleAssignOccupant(room.name, i, occ)
                      }
                      onUnassign={() => handleUnassignOccupant(room.name, i)}
                      onMove={(occ) => handleMoveOccupant(occ, room.name)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setNewRoomDetails({ name: "", type: type });
                setIsNewRoomModalOpen(true);
              }}
              className="w-full mt-2 p-2 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center"
            >
              <Plus size={16} className="mr-1" /> Add Room
            </button>
          </div>
        ))}
      </div>

      {/* Move Person Modal */}
      <Modal
        isOpen={!!movePersonState}
        onClose={() => setMovePersonState(null)}
        title="Move Person"
      >
        {movePersonState && (
          <div className="space-y-4">
            <p>
              Move <strong>{movePersonState.occupant.clientName}</strong> to:
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {rooms.map((room) => (
                <button
                  key={room.name}
                  onClick={() => executeMove(room.name)}
                  disabled={
                    room.occupants.filter((o) => o).length >= room.capacity
                  }
                  className="w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  {room.name} ({room.occupants.filter((o) => o).length}/
                  {room.capacity})
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* New Room Modal */}
      <Modal
        isOpen={isNewRoomModalOpen}
        onClose={() => setIsNewRoomModalOpen(false)}
        title="Add New Room"
      >
        <div className="space-y-4">
          <div>
            <label>Room Name</label>
            <input
              type="text"
              value={newRoomDetails.name}
              onChange={(e) =>
                setNewRoomDetails({ ...newRoomDetails, name: e.target.value })
              }
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsNewRoomModalOpen(false)}
              className="p-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNewRoom}
              className="p-2 bg-blue-600 text-white rounded"
            >
              Add Room
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
