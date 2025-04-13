import { Pill, PillAvatar } from '@/components/ui/kibo-ui/pill';
import Link from 'next/link';

export const PoweredBy = () => (
  <div className="fixed right-4 bottom-4 z-50">
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground text-xs">Powered by</div>
      <Pill className="bg-primary text-primary-foreground hover:bg-primary">
        <PillAvatar
          src="https://res.cloudinary.com/murshidazher/dpr_1.0,c_scale,f_webp,fl_awebp.progressive.progressive:semi,f_webp,fl_awebp,q_80/avatar.jpg"
          fallback="MA"
        />
        <Link href="https://murshidazher.com/">@murshidazher</Link>
      </Pill>
      <Pill className="bg-primary text-primary-foreground hover:bg-primary">
        <PillAvatar
          src="https://www.orate.dev/apple-icon.png?1744a036efa43016"
          fallback="OR"
        />
        <Link href="https://www.orate.dev/">Orate</Link>
      </Pill>
      <Pill className="bg-primary text-primary-foreground hover:bg-primary">
        <PillAvatar
          src="https://khagwal.com/static/favicon/apple-icon-180x180.png?v.1.0.1"
          fallback="KL"
        />
        <Link href="https://khagwal.com/interactions/">@khagwal</Link>
      </Pill>
    </div>
  </div>
);
