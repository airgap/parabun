import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);
	let tag = $.prop($$props, 'tag', 12);

	function flip(node, animation, params) {
		const dx = animation.from.left - animation.to.left;
		const dy = animation.from.top - animation.to.top;

		return {
			duration: 100,
			tick: (t, u) => {
				node.dx = u * dx;
				node.dy = u * dy;
			}
		};
	}

	function update(new_tag, new_things) {
		things(new_things);
		tag(new_tag);
	}

	var $$exports = {
		update,
		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		},

		get tag() {
			return tag();
		},

		set tag($$value) {
			tag($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.each(node_1, 9, things, (thing) => thing.id, ($$anchor, thing) => {
		var fragment_1 = $.comment();
		var node_2 = $.first_child(fragment_1);

		$.element(node_2, tag, false, ($$element, $$anchor) => {
			$.animation($$element, () => flip, null);

			var text = $.text();

			$.template_effect(() => $.set_text(text, ($.get(thing), $.untrack(() => $.get(thing).name))));
			$.append($$anchor, text);
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'update', update);

	return $.pop($$exports);
}