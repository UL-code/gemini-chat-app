import ChatBot from './components/chat/ChatBot';

function App() {
   return (
      <div className="flex justify-center p-4 h-screen w-full">
         <div className="w-full max-w-3xl h-full flex flex-col">
            <ChatBot />
         </div>
      </div>
   );
}

export default App;
