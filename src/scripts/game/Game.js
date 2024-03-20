import * as PIXI from "pixi.js";
import { App } from "../system/App";
import { Board } from "./Board";
import { CombinationManager } from "./CombinationManager";

export class Game {
    constructor() {
        this.container = new PIXI.Container();
        this.createBackground();
        this.board= new Board();
        this.container.addChild(this.board.container);
        this.board.container.on('tile-touch-start', this.onTileClick.bind(this));
        this.combinationManager = new CombinationManager(this.board);
        this.removeStartMatches();
    }

    removeStartMatches() {
        let matches = this.combinationManager.getMatches(); // find combinations to collect

        while(matches.length) { // as long as there are combinations
            this.removeMatches(matches); // remove tiles in combinations

            const fields = this.board.fields.filter(field => field.tile === null); // find empty fields

            fields.forEach(field => { // in each empty field
                this.board.createTile(field); // create a new random tile
            });

            matches = this.combinationManager.getMatches(); // looking for combinations again after adding new tiles
        }
    }

    onTileClick(tile){
        if(this.disabled){
            return;
        }
        if (this.selectedTile) {
            if (!this.selectedTile.isNeighbour(tile)) {
                this.clearSelection(tile);
                this.selectTile(tile);
            } else {
                this.swap(this.selectedTile, tile);
            }
        } else {
            this.selectTile(tile);
        }
    }
    swap(selectedTile, tile, reverse) {
        this.disabled = true;
        selectedTile.sprite.zIndex = 2;

        selectedTile.moveTo(tile.field.position, 0.2);

        this.clearSelection();

        tile.moveTo(selectedTile.field.position, 0.2).then(() => {
            this.board.swap(selectedTile, tile);

            // after the swap, check if it was the main swap or reverse
            if (!reverse) {
                // if this is the main swap, then we are looking for combinations
                const matches = this.combinationManager.getMatches();
                if (matches.length) {
                    // if there are combinations, then process them
                    this.processMatches(matches);
                } else {
                    // if there are no combinations after the main swap, then perform a reverse swap by running the same method, but with the reverse parameter
                    this.swap(tile, selectedTile, true);
                }
            } else {
                // in this condition, by the reverse flag, we understand that the swap was reversed, so there is no need to look for combinations.
                // all you need to do is unlock the board, because here the movement is already completed and there are no other animations
                this.disabled = false;
            }
        });
    } 

    processMatches(matches) {
        this.removeMatches(matches);
        this.processFallDown()
            .then(() => this.addTiles())
            .then(() => this.onFallDownOver());
    }

    onFallDownOver() {
        const matches = this.combinationManager.getMatches();

        if (matches.length) {
            this.processMatches(matches)
        } else {
            this.disabled = false;
        }
    }

    addTiles() {
        return new Promise(resolve => {
            // get all fields that don't have tiles
            const fields = this.board.fields.filter(field => field.tile === null);
            let total = fields.length;
            let completed = 0;
    
            // for each empty field
            fields.forEach(field => {
                // create a new tile
                const tile = this.board.createTile(field);
                if (tile) { // Check if tile is not null or undefined
                    // put it above the board
                    tile.sprite.y = -500;
                    const delay = Math.random() * 2 / 10 + 0.3 / (field.row + 1);
                    // start the movement of the tile in the given empty field with the given delay
                    tile.fallDownTo(field.position, delay).then(() => {
                        ++completed;
                        if (completed >= total) {
                            resolve();
                        }
                    });
                } else {
                    ++completed; // Increment completed even if tile is null
                    if (completed >= total) {
                        resolve();
                    }
                }
            });
        });
    }
    

    processFallDown() {
        return new Promise(resolve => {
            let completed = 0;
            let started = 0;

            // check all fields of the board, starting from the bottom row
            for (let row = this.board.rows - 1; row >= 0; row--) {
                for (let col = this.board.cols - 1; col >= 0; col--) {
                    const field = this.board.getField(row, col);

                    // if there is no tile in the field
                    if (!field.tile) {
                        ++started;

                        // shift all tiles that are in the same column in all rows above
                        this.fallDownTo(field).then(() => {
                            ++completed;
                            if (completed >= started) {
                                resolve();
                            }
                        });
                    }
                }
            }
        });
    }
    fallDownTo(emptyField) {
        // checking all board fields in the found empty field column, but in all higher rows
        for (let row = emptyField.row - 1; row >= 0; row--) {
            let fallingField = this.board.getField(row, emptyField.col);

            // find the first field with a tile
            if (fallingField.tile) {
                // the first found tile will be placed in the current empty field
                const fallingTile = fallingField.tile;
                fallingTile.field = emptyField;
                emptyField.tile = fallingTile;
                fallingField.tile = null;
                // run the tile move method and stop searching a tile for that empty field
                return fallingTile.fallDownTo(emptyField.position);
            }
        }

        return Promise.resolve();
    }

    removeMatches(matches) {
        matches.forEach(match => {
            match.forEach(tile => {
                tile.remove();
            });
        });
    }
    

   
    clearSelection(){
        if(this.selectedTile ){
        this.selectedTile.field.unselect();
        this.selectedTile = null;
        }
    }
    selectTile(tile){
        this.selectedTile=tile;
        this.selectedTile.field.select();
    }
    createBackground() {
        this.bg = App.sprite("bg");
        this.bg.width = window.innerWidth;
        this.bg.height = window.innerHeight;
        this.container.addChild(this.bg);
    }

}