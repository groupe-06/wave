
export const modifyStateAccount = async (req, res) => {
    const userId = req.userId;
    console.log(userId);
    return res.status(200).json({ message: 'Compte mis à jour', data: userId });
    /*const { etat } = req.body;
    try {
        const compte = await Compte.findByIdAndUpdate(id, { etat }, { new: true });
        return res.status(200).json({ message: 'Compte mis à jour', data: compte });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Failed to update compte', error });
    }*/
};