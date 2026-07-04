import { Building2, Plus, Settings2 } from "lucide-react";
import { Role, RoomStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/server/guards";
import { listAmenities, listBranches, listRoomsForAdmin } from "@/server/services/room-service";

import { createAmenityAction, createRoomAction, updateRoomStatusAction } from "./actions";

const roomStatuses = Object.values(RoomStatus);

export default async function AdminPage() {
  await requireRole([Role.SUPER_ADMIN]);
  const [branches, amenities, rooms] = await Promise.all([listBranches(), listAmenities(), listRoomsForAdmin()]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Admin workspace</p>
        <h1 className="text-3xl font-semibold">Rooms and amenities</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    {room.name}
                  </CardTitle>
                  <CardDescription>
                    {room.branch.name} / {room.capacity} seats / {room.hourlyRate.toString()} THB/hour
                  </CardDescription>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">{room.status}</span>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{room.description || "No description"}</p>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map(({ amenity }) => (
                    <span className="rounded-md border px-2 py-1 text-xs" key={amenity.id}>
                      {amenity.icon ? `${amenity.icon} ` : ""}
                      {amenity.name}
                    </span>
                  ))}
                </div>
                <form action={updateRoomStatusAction} className="flex flex-wrap items-end gap-3">
                  <input name="roomId" type="hidden" value={room.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`status-${room.id}`}>Status</Label>
                    <select
                      className="h-10 rounded-md border border-input bg-card px-3 text-sm"
                      defaultValue={room.status}
                      id={`status-${room.id}`}
                      name="status"
                    >
                      {roomStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="secondary">
                    Update
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
                New room
              </CardTitle>
              <CardDescription>Create a bookable meeting room.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createRoomAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="branchId">Branch</Label>
                  <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" id="branchId" name="branchId" required>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Room name</Label>
                  <Input id="name" name="name" placeholder="Focus Room A" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Seats</Label>
                    <Input id="capacity" min="1" name="capacity" type="number" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">THB/hour</Label>
                    <Input id="hourlyRate" min="0" name="hourlyRate" step="0.01" type="number" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" id="description" name="description" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input id="imageUrl" name="imageUrl" placeholder="https://..." type="url" />
                </div>
                <div className="space-y-2">
                  <Label>Amenities</Label>
                  <div className="grid gap-2">
                    {amenities.map((amenity) => (
                      <label className="flex items-center gap-2 text-sm" key={amenity.id}>
                        <input className="h-4 w-4" name="amenityIds" type="checkbox" value={amenity.id} />
                        <span>{amenity.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button className="w-full" type="submit">
                  Create room
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" aria-hidden="true" />
                New amenity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createAmenityAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amenityName">Name</Label>
                  <Input id="amenityName" name="name" placeholder="Whiteboard" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenityIcon">Icon text</Label>
                  <Input id="amenityIcon" name="icon" placeholder="optional" />
                </div>
                <Button className="w-full" type="submit" variant="secondary">
                  Add amenity
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
