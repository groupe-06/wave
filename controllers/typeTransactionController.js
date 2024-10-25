import TypeTransaction from "../models/typeTransaction.js";

export const createTypeTransaction = async (req, res) => {
    try{
        const {frais, nom} = req.body;
        if(!nom){
            return res.status(400).json({message: "Le nom obligatoire"});
        }

        const typeTransactionExist = await TypeTransaction.findOne({nom});
        if(typeTransactionExist){
            return res.status(400).json({message: "Ce type de transaction existe déjà"});
        }
        const typeTransaction = new TypeTransaction({frais, nom});
        await typeTransaction.save();
        res.status(201).json({message: 'Type de transaction crée avec succès', typeTransaction} );
    }catch(error){
        console.log(error);
        return res.status(500).json({message: error.message});
    }
   
}