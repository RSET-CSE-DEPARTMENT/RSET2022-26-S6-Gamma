import React from 'react';

interface ConfirmationCardProps {
  onClose: () => void;
}

const ConfirmationCard: React.FC<ConfirmationCardProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="w-[296px] h-[371px] relative bg-[#f6fcf7] rounded-lg p-4">
        <div className="flex justify-center">
          <div className="w-[149px] h-[136px] bg-[#ffb94b]/90 rounded-full"></div>
        </div>
        <div className="mt-4 text-center text-black text-2xl font-medium leading-[33.60px]">
          Great! Your event was<br />successfully created
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-[#246d8c] text-white rounded-md"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const conformCard: React.FC = () => {
  const handleClose = () => {
  };

  return (
    <div>
      <ConfirmationCard onClose={handleClose} />
    </div>
  );
};

export default conformCard;
