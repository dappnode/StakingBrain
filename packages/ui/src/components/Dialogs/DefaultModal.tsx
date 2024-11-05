import { Button, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

export interface DefaultModalProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  children: JSX.Element;
}

export default function DefaultModal({
  isOpen,
  setIsOpen,
  title,
  children,
}: DefaultModalProps) {
  function close() {
    setIsOpen(false);
  }

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-20 focus:outline-none"
      onClose={close}
      __demoMode
    >
      <div className="fixed inset-0 z-20 w-screen overflow-y-auto bg-gray-950/85">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="data-[closed]:transform-[scale(95%)] w-full max-w-xl rounded-xl bg-interface-100 dark:bg-dark-interface-100 p-6 duration-300 ease-out data-[closed]:opacity-0"
          >
            <DialogTitle as="h3" className="text-2xl mb-5">
              {title}
            </DialogTitle>
            <div className="flex flex-col gap-5">{children}</div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
