<template>
    <div class="hierarchy">
        <instruments></instruments>
        <ul class="hierarchy__list">
            <hierarchy-item v-for="item in tree.children" :item="item" :key="item.uuid" :level="0">
            </hierarchy-item>
        </ul>
    </div>
</template>

<script>
import HierarchyItem from './HierarchyItem';
import Instruments from './Instruments';

export default {
  name: 'Hierarchy',
  components: {
    HierarchyItem,
    Instruments,
  },
  data() {
    return {
      tree: this.$store.state.tree,
    };
  },
};


</script>

<style scoped lang="less">

    .hierarchy {
        width: 250px;
        height: 100%;
        padding-top: 10px;
        padding-bottom: 10px;
        overflow-y: auto;
        box-sizing: border-box;
        background-color: #fff;

        &__list {
            margin: 0;
            padding: 0;
            list-style-type: none;
        }
    }
</style>
