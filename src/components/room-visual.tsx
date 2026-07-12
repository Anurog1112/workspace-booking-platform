import { DoorOpen } from "lucide-react";
import Image from "next/image";

type RoomVisualProps = {
  imageUrl?: string | null;
  name: string;
};

export function RoomVisual({ imageUrl, name }: RoomVisualProps) {
  if (imageUrl?.startsWith("https://images.unsplash.com/")) {
    return (
      <div className="relative h-full min-h-40 w-full overflow-hidden">
        <Image alt={name} className="object-cover" fill sizes="(max-width: 1024px) 100vw, 760px" src={imageUrl} />
      </div>
    );
  }

  if (imageUrl) {
    return <div aria-label={name} className="h-full min-h-40 w-full bg-cover bg-center" role="img" style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }} />;
  }

  return (
    <div className="flex h-full min-h-40 w-full items-center justify-center bg-muted">
      <div className="text-center">
        <DoorOpen className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-muted-foreground">{name}</p>
      </div>
    </div>
  );
}
