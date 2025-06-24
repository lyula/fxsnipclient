import { useRef, useState } from "react";
import { FaImage, FaSmile, FaPoll, FaCalendarAlt, FaTimes, FaFileImage } from "react-icons/fa";

export default function CreatePostBox({ onPost, onClose }) {
  const [value, setValue] = useState("");
  const [image, setImage] = useState(null);
  const fileInput = useRef();

  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-lg relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
          onClick={onClose}
        >
          <FaTimes size={20} />
        </button>
        <textarea
          className="w-full rounded border px-3 py-2 text-base mb-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="What's happening?"
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={3}
        />
        {image && (
          <div className="mb-2">
            <img src={image} alt="preview" className="max-h-40 rounded" />
          </div>
        )}
        <div className="flex items-center gap-4 mb-3">
          <button type="button" onClick={() => fileInput.current.click()} className="text-[#a99d6b] hover:text-[#1E3A8A]">
            <FaImage size={20} />
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInput}
            className="hidden"
            onChange={handleImage}
          />
          <button type="button" className="text-[#a99d6b] hover:text-[#1E3A8A]">
            <FaSmile size={20} />
          </button>
          <button type="button" className="text-[#a99d6b] hover:text-[#1E3A8A]">
            <FaFileImage size={20} />
          </button>
          <button type="button" className="text-[#a99d6b] hover:text-[#1E3A8A]">
            <FaPoll size={20} />
          </button>
          <button type="button" className="text-[#a99d6b] hover:text-[#1E3A8A]">
            <FaCalendarAlt size={20} />
          </button>
        </div>
        <button
          className="bg-[#1E3A8A] text-white px-6 py-2 rounded-full font-bold float-right"
          onClick={() => {
            if (value.trim()) {
              onPost(value, image);
              setValue("");
              setImage(null);
              onClose();
            }
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
}