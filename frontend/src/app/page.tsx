import Header from '../components/Header';
import ImageUpload from '../components/ImageUpload';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4"><center>Analyze Food Label</center></h2>
          <ImageUpload />
        </div>
      </main>
    </div>
  );
}
