import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let objectsArray = $.prop($$props, 'objectsArray', 12);

	var $$exports = {
		get objectsArray() {
			return objectsArray();
		},

		set objectsArray($$value) {
			objectsArray($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, objectsArray, $.index, ($$anchor, $$item) => {
		let prop0 = () => $.get($$item)[0];
		let propFooBar = () => $.get($$item)["foo-bar"];
		let varProp = () => $.get($$item).prop;
		var p = root_1();
		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `${propFooBar() ?? ''}: ${varProp() ?? ''} ${prop0() ?? ''}`));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}