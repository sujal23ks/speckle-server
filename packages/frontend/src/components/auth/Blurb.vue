<template>
  <v-card class="elevation-0 transparent pa-5 pb-0">
    <v-card-text class="text-h3 text-sm-h4 text-md-h3 primary--text">
      <span class="primary--text">
        <b>
          <a class="text-decoration-none" href="https://speckle.systems" target="_blank">Speckle</a>
        </b>
      </span>
      <span class="font-weight-light">, empowering your design and construction data.</span>
    </v-card-text>
    <div class="">
      <v-card-text class="text-h6 font-weight-regular">
       
        Better CNC Factory project
        <span class="primary--text text--disabled">
          A collaboartion project between Fiction Factory, The Institute for Advanced Architecture of Catalonia (IAAC) and Jesse Howard
        </span>
      </v-card-text>
    </div>
  </v-card>
</template>
<script>
export default {
  name: 'Blurb',
  props: ['serverInfo']
}
</script>
