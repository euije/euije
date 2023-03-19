import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import { db } from "./api/firebase/firebase";

import "./App.css";

/* type */
import { DocumentData } from "firebase/firestore";

const App = () => {
  const [comment, setComment] = useState<DocumentData[]>();

  useEffect(() => {
    const fetchData = async () => {
      const querySnapshot = await getDocs(collection(db, "comment"));
      const data: DocumentData[] = [];

      querySnapshot.forEach((doc) => {
        data.push(doc.data());
      })

      setComment(data);
      console.log(data);
    }
    fetchData();
  }, []);

  if (comment === undefined) {
    return (
      <h1>Loading...</h1>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        {
          comment.map((data) =>
            <div className={"inline-block h-12 w-12 rounded-full ring-2 ring-white"}>
              <div className={"text-black"}>{data.content}</div>
              <div>{data.created_at}</div>
              <div>{data.writer}</div>
            </div>
          )
        }
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>

      </header>
    </div>
  );
}

export default App;
