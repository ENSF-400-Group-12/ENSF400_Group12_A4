// Page for uploading new clothing items

function AddItem() {

  return (

    <div className="form-page">

      <h1>Add Clothing Item</h1>

      <input type="file" />

      <input type="text" placeholder="Type (shirt, pants)" />

      <input type="text" placeholder="Color" />

      <input type="text" placeholder="Season" />

      <button className="button-primary">
        Save Item
      </button>

    </div>

  );
}

export default AddItem;