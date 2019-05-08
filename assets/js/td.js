/**
 * TrippleD class
 * 
 * @version 0.0.1
 * @author  Paul Kruijt
 */
class TD {
    constructor() {
        // private
        this._queriedData = null;

        // public
        this.collections = {};
        this.models = {};

        // run scripts
        this._initialize();
    }
    
    /**
     * Initialize DomPlus and make it globally available
     * 
     * @return void
     */
    _initialize() {
        window.td = this;
        this._collectData();
        this._observeCollectedData();
    }

    /**
     * Get parent by selector (recursively up the tree)
     * 
     * @param  HTMLElement element
     * @param  string selector
     * @return HTMLElement|null
     */
    _parent(element, selector) {
        if (!Element.prototype.matches) {
            Element.prototype.matches =
            Element.prototype.matchesSelector ||
            Element.prototype.mozMatchesSelector ||
            Element.prototype.msMatchesSelector ||
            Element.prototype.oMatchesSelector ||
            Element.prototype.webkitMatchesSelector ||
            function(s) {
                var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                    i = matches.length;
                while (--i >= 0 && matches.item(i) !== this) {}
                return i > -1;
            };
        }
    
        // get closest match
        for (; element && element !== document; element = element.parentNode) {
            if (element.matches(selector)) {
                return element;
            }
        }
    
        return;
    }

    /**
     * Collect all of the data for every mutation
     * 
     * @return void
     */
    _collectData() {
        const models = document.querySelectorAll('[td-model],[data-td-model]');
        if (models.length) {
            for (let i = 0; i < models.length; i++) {
                let oldData = {};
                let collectionRef = null;

                const model = models[i];
                const modelRef = model.getAttribute('td-model');
                this._replaceDataAttribute(model, 'model');

                const collection = this._parent(model, '[td-collection],[data-td-collection]');
                if (collection) {
                    this._replaceDataAttribute(collection, 'collection');

                    collectionRef = collection.getAttribute('td-collection');
                    if (collectionRef) {
                        if (!this.collections[collectionRef]) {
                            this.collections[collectionRef] = {};
                        } else if (this.collections[collectionRef][modelRef]) {
                            oldData = this.collections[collectionRef][modelRef];
                        }
                    }
                } else {
                    if (modelRef) {
                        if (!this.models[modelRef]) {
                            this.models[modelRef] = {};
                        } else {
                            oldData = this.models[modelRef];
                        }
                    }
                }

                // add all properties to the model
                const newData = this._collectPropertyData(model);

                // merge old and new data
                let data = {...oldData, ...newData};
                
                // add element to the data _elements property
                if (!data._elements) {
                    data._elements = [];
                }
                data._elements.push(model);

                // set new data
                if (collection) {
                    this.collections[collectionRef][modelRef] = data;
                } else {
                    this.models[modelRef] = data;
                }
            }
        }
    }

    /**
     * Collect property data and build model object
     * 
     * @param  HTMLElement rootElement
     * @return Object data
     */
    _collectPropertyData(rootElement) {
        const data = {};
        const subject = 'property';
        const dataSelector = `data-td-${subject}`;
        const elements = rootElement.querySelectorAll(`[td-${subject}],[${dataSelector}]`);
        
        if (elements.length) {
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                this._replaceDataAttribute(element, subject);

                const reference = element.getAttribute(`td-${subject}`);
                data[reference] = element.innerText;
            }
        }

        return data;
    }

    /**
     * Replace data-attribute from passed element for td-attribute
     * Because in the end we want to query on one specific selector
     * 
     * @param  HTMLElement element
     * @param  string subject
     * @return void
     */
    _replaceDataAttribute(element, subject) {
        const dataSelector = `data-td-${subject}`;
        const dataAttribute = element.getAttribute(dataSelector);

        if (dataAttribute) {
            element.setAttribute(`td-${subject}`, dataAttribute);
            element.removeAttribute(dataSelector);
        }
    }

    /**
     * Observe collected data
     * 
     * @return void
     */
    _observeCollectedData() {
        const collectionRefs = Object.keys(this.collections);
        if (collectionRefs.length) {
            for (let i = 0; i < collectionRefs.length; i++) {
                const collectionRef = collectionRefs[i];

                // observe model data in collection
                this._observeModelData(this.collections[collectionRef]);
                
                // observe collection data
                this.collections[collectionRef] = this._observeData(this.collections[collectionRef], this._observeCollectionDataHandler());
            }

            this.collections = this._observeData(this.collections, this._observeCollectionsDataHandler());
        }
        
        // observe model data in root
        this._observeModelData(this.models);
        this.models = this._observeData(this.models, this._observeModelDataHandler());
    }

    /**
     * Observe collected model data
     * 
     * @param  Object root
     * @return void
     */
    _observeModelData(root) {
        const refs = Object.keys(root);
        if (refs.length) {
            for (let i = 0; i < refs.length; i++) {
                const ref = refs[i];
                root[ref] = this._observeData(root[ref], this._observeModelDataHandler());
            }
        }
    }

    /**
     * Observe the passed data object
     * 
     * @param  Object data
     * @param  Object handler
     * @return Proxy
     */
    _observeData(data, handler) {
        return new Proxy(data, handler);
    }

    /**
     * Get the handler for the collections data observer
     * 
     * @return Object
     */
    _observeCollectionsDataHandler() {
        return {
            set(target, key, value) {
                console.log('Setting collections data', target);
                return true;
            },

            deleteProperty(target, key) {
                console.log('Deleting collections data', target);
                return true;
            }
        };
    }

    /**
     * Get the handler for the collection data observer
     * 
     * @return Object
     */
    _observeCollectionDataHandler() {
        return {
            set(target, key, value) {
                console.log('Setting collection data', target);
                return true;
            },

            deleteProperty(target, key) {
                console.log('Deleting collection data', target);
                return true;
            }
        };
    }

    /**
     * Get the handler for the model data observer
     * 
     * @return Object
     */
    _observeModelDataHandler() {
        const that = this;

        return {
            set(target, key, value) {
                console.log('Setting model data', target);
                target[key] = value;
                if (key !== '_elements') {
                    const elements = target._elements;
                    if (elements) {
                        for (let i = 0; i < elements.length; i++) {
                            const element = elements[i];
                            const property = element.querySelector(`[td-property="${key}"]`);
                            if (property) {
                                property.innerText = value;
                            }
                        }
                    }
                }
                return true;
            },

            deleteProperty(target, key) {
                console.log('Deleting model data', target);
                return true;
                //return that._deleteProperty(target, key, false);
            }
        };
    }

    /**
     * Generic deletion of an object property
     * 
     * @param  target 
     * @param  integer key
     * @param  boolean deleteParent
     * @return boolean
     */
    _deleteProperty(target, key, deleteParent) {
        const element = this.elements[key];
        element.parentNode.removeChild(element);

        delete target[key];

        if (deleteParent) {
            //console.log(target);
            // elements = target[prop].elements;
            // if (elements && !elements.length) {
            // }
        }

        return true;
    }

    /**
     * Find model based on dot-separated string
     * 
     * @param  string selector 
     * @return Object|null model 
     */
    collection(selector) {
        if (selector) {
            if (this.collections[selector]) {
                this._queriedData = this.collections[selector];
                return this._queriedData;
            }
        }

        console.warn(`We couldn't find collection: ${selector}`);
        return;
    }

    /**
     * Find model based on dot-separated string
     * 
     * @param  string selector 
     * @return Object|null model 
     */
    model(selector) {
        if (selector) {
            const parts = selector.split('.');
            const totalParts = parts.length;
            if (totalParts < 3) {
                // model might be in a collection
                if (totalParts === 2) {
                    const collection = this.collections[parts[0]];
                    if (collection && collection[parts[1]]) {
                        this._queriedData = collection[parts[1]];
                        return this._queriedData;
                    }
                }
                // model lives in the root
                else {
                    if (this.models[parts[0]]) {
                        this._queriedData = this.models[parts[0]];
                        return this._queriedData;
                    }
                }
            }
        }

        console.warn(`We couldn't find model: ${selector}`);
        return;
    }

    /**
     * Insert a model (in a collection)
     * 
     * @param  string collectionRef 
     * @param  object data
     * @return void 
     */
    insert(collectionRef, data) {
        // td.insert('projects', {...});
        // td.update('projects.1', {...});
        // td.delete('projects.1');
        // td.find('projects.1');
    }

    /**
     * Update a model (in a collection)
     * 
     * @param  string selector 
     * @param  Object data
     * @return Object|null 
     */
    update(selector, data = {}) {
        const totalKeys = Object.keys(data).length;
        if (totalKeys) {
            let model = this.model(selector);
            if (model) {
                for (let i = 0; i < totalKeys; i++) {
                    const key = Object.keys(data)[i];
                    model[key] = data[key];
                }

                return model;
            } else {
                console.warn(`Model not found based on the passed selector: ${selector}`);
            }
        } else {
            console.warn(`You have to pass a data object with keys (second parameter) to update the model.`);
        }

        return;
    }

    /**
     * Delete a model (in a collection)
     * 
     * @param  string selector 
     * @return void 
     */
    delete(selector) {
        if (selector) {
            const parts = selector.split('.');
            const totalParts = parts.length;
            if (totalParts < 3) {
                // model might be in a collection
                if (totalParts === 2) {
                    const collection = this.collections[parts[0]];
                    if (collection && collection[parts[1]]) {
                        delete collection[parts[1]];
                        return collection;
                    }
                }
                // model lives in the root
                else {
                    if (this.models[parts[0]]) {
                        delete this.models[parts[0]];
                        return this.models;
                    }
                }
            }
        }
    }
}

// always run DomPlus
document.addEventListener('DOMContentLoaded', () => {
    new TD;
});